require "rails_helper"
RSpec.describe "Private watchlists", type: :request do
  it "accepts bodyless requests with the frontend's JSON content type" do
    user, property = make_user, make_property
    headers = sign_in(user).merge("Content-Type" => "application/json")

    get "/api/v1/watchlist", headers: headers
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["properties"]).to eq([])

    put "/api/v1/watchlist/#{property.id}", headers: headers
    expect(response).to have_http_status(:ok)
    expect(user.watchlist_entries.where(property: property).count).to eq(1)

    delete "/api/v1/watchlist/#{property.id}", headers: headers
    expect(response).to have_http_status(:no_content)
    expect(user.watchlist_entries.count).to eq(0)
  end

  it "rejects explicit query and JSON body overrides" do
    headers = sign_in(make_user)
    property = make_property

    get "/api/v1/watchlist", params: { user_id: 1 }, headers: headers
    expect(response).to have_http_status(:bad_request)

    put "/api/v1/watchlist/#{property.id}", params: { watchlist: {} }, headers: headers, as: :json
    expect(response).to have_http_status(:bad_request)
  end

  it "isolates owners, rejects overrides and supports repeated saves/removals" do
    alex = make_user
    sam = make_user(email: "sam@example.com")
    property = make_property
    sam.watchlist_entries.create!(property: property)
    headers = sign_in(alex)
    get "/api/v1/watchlist", headers: headers
    expect(response.parsed_body["properties"]).to eq([])
    put "/api/v1/watchlist/#{property.id}", params: { user_id: sam.id }, headers: headers, as: :json
    expect(response).to have_http_status(:bad_request)
    2.times do
      put "/api/v1/watchlist/#{property.id}", headers: headers
      expect(response).to have_http_status(:ok)
    end
    expect(alex.watchlist_entries.count).to eq(1)
    2.times { delete "/api/v1/watchlist/#{property.id}", headers: headers; expect(response).to have_http_status(:no_content) }
    expect(sam.watchlist_entries.count).to eq(1)
  end
  it "denies anonymous writes with a valid anonymous token" do
    property = make_property
    put "/api/v1/watchlist/#{property.id}", headers: csrf_headers
    expect(response).to have_http_status(:unauthorized)
  end
  it "denies anonymous reads and removals without changing another owner's watches" do
    owner, property = make_user, make_property
    owner.watchlist_entries.create!(property: property)
    headers = csrf_headers
    get "/api/v1/watchlist", headers: headers
    expect(response).to have_http_status(:unauthorized)
    delete "/api/v1/watchlist/#{property.id}", headers: headers
    expect(response).to have_http_status(:unauthorized)
    expect(owner.watchlist_entries.where(property: property).count).to eq(1)
  end
  it "returns 404 for nonexistent properties" do
    headers = sign_in(make_user)
    put "/api/v1/watchlist/999999999", headers: headers
    expect(response).to have_http_status(:not_found)
  end
end

RSpec.describe "Competing watch saves", type: :request do
  self.use_transactional_tests = false

  after do
    WatchlistEntry.delete_all
    User.delete_all
    Property.delete_all
  end

  it "commits exactly one watch when two authenticated sessions save together" do
    user, property = make_user, make_property
    sessions = 2.times.map do
      client = ActionDispatch::Integration::Session.new(Rails.application)
      client.host! "localhost:5173"
      client.get "/api/v1/csrf"
      token = client.response.parsed_body.fetch("csrf_token")
      client.post "/api/v1/session", params: { email: user.email, password: "DemoPassword123!" },
        headers: { "X-CSRF-Token" => token, "Origin" => "http://localhost:5173" }, as: :json
      expect(client.response.status).to eq(200)
      [client, client.response.parsed_body.fetch("csrf_token")]
    end
    ready, release = Queue.new, Queue.new
    workers = sessions.map do |client, token|
      Thread.new do
        Rails.application.executor.wrap do
          ActiveRecord::Base.connection_pool.with_connection do
            ready << true
            release.pop
            client.put "/api/v1/watchlist/#{property.id}",
              headers: { "X-CSRF-Token" => token, "Origin" => "http://localhost:5173" }
            client.response.status
          end
        end
      end
    end
    2.times { ready.pop }
    2.times { release << true }
    expect(workers.map(&:value)).to eq([200, 200])
    expect(user.watchlist_entries.where(property: property).count).to eq(1)
  end
end

RSpec.describe "Watchlist pagination", type: :request do
  it "bounds listing payloads, retains all saved IDs and preloads relationships" do
    user = make_user
    properties = 14.times.map { make_property }
    properties.each { |property| user.watchlist_entries.create!(property: property) }
    headers = sign_in(user)
    queries = []
    listener = ->(*args) { payload = args.last; queries << payload[:sql] unless payload[:cached] || payload[:name] == "SCHEMA" }
    ActiveSupport::Notifications.subscribed(listener, "sql.active_record") do
      get "/api/v1/watchlist", headers: headers
    end
    expect(response.parsed_body["properties"].length).to eq(12)
    expect(response.parsed_body["saved_ids"]).to eq(properties.map(&:id))
    expect(queries.grep(/SELECT.*FROM "properties"/).length).to eq(1)
    get "/api/v1/watchlist?page=2", headers: headers
    expect(response.parsed_body["properties"].map { |property| property["id"] }).to eq(properties.last(2).map(&:id))
    expect(response.parsed_body["meta"]).to include("page" => 2, "total_count" => 14)
    get "/api/v1/watchlist?page=999", headers: headers
    expect(response.parsed_body["meta"]["page"]).to eq(2)
    get "/api/v1/watchlist?page=invalid", headers: headers
    expect(response).to have_http_status(:unprocessable_content)
  end
end
