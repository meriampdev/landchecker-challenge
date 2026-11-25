require "rails_helper"
RSpec.describe "Registration", type: :request do
  def register(**attributes)
    post "/api/v1/users", params: { email: " New@example.com ", password: "DemoPassword123!", password_confirmation: "DemoPassword123!" }.merge(attributes), headers: csrf_headers, as: :json
  end
  it "creates a normalized account and signs it in without exposing secrets" do
    register
    expect(response).to have_http_status(:created)
    expect(response.parsed_body["user"]["email"]).to eq("new@example.com")
    expect(response.body).not_to include("password")
    expect(response.parsed_body["csrf_token"]).to be_present
    get "/api/v1/me", headers: { "Host" => "localhost:5173" }
    expect(response).to have_http_status(:ok)
  end
  it "rejects duplicate email, short passwords and mismatched confirmation" do
    make_user
    register(email: "ALEX@example.com")
    expect(response).to have_http_status(:unprocessable_entity)
    register(password: "short", password_confirmation: "short")
    expect(response).to have_http_status(:unprocessable_entity)
    register(password_confirmation: "different")
    expect(response).to have_http_status(:unprocessable_entity)
    expect(User.count).to eq(1)
  end
end
