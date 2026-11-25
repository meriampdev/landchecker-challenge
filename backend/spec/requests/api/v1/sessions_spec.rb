require "rails_helper"
RSpec.describe "Sessions", type: :request do
  it "normalizes email, rotates token and logs out" do
    user = make_user
    anonymous = csrf_headers
    post "/api/v1/session", params: { email: " ALEX@example.com ", password: "DemoPassword123!" }, headers: anonymous, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["user"]).to eq("id" => user.id, "email" => user.email)
    token = response.parsed_body.fetch("csrf_token")
    expect(token).not_to eq(anonymous["X-CSRF-Token"])
    delete "/api/v1/session", headers: anonymous.merge("X-CSRF-Token" => token)
    expect(response).to have_http_status(:ok)
    get "/api/v1/me", headers: { "Host" => "localhost" }
    expect(response).to have_http_status(:unauthorized)
  end
  it "rejects invalid credentials without serializing passwords" do
    make_user
    post "/api/v1/session", params: { email: "alex@example.com", password: "wrong" }, headers: csrf_headers, as: :json
    expect(response).to have_http_status(:unauthorized)
    expect(response.body).not_to include("password_digest")
  end
end
