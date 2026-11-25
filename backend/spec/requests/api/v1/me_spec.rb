require "rails_helper"
RSpec.describe "Identity", type: :request do
  it "persists across requests and denies anonymous access" do
    get "/api/v1/me", headers: { "Host" => "localhost" }
    expect(response).to have_http_status(:unauthorized)
    user = make_user
    sign_in(user)
    2.times do
      get "/api/v1/me", headers: { "Host" => "localhost" }
      expect(response.parsed_body["user"]).to eq("id" => user.id, "email" => user.email)
      expect(response.headers["Cache-Control"]).to include("no-store")
    end
  end
end
