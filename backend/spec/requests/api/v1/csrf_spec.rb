require "rails_helper"
RSpec.describe "CSRF protection", type: :request do
  it "rejects login with no token and with a mismatched origin" do
    user = make_user
    credentials = { email: user.email, password: "DemoPassword123!" }
    post "/api/v1/session", params: credentials, as: :json
    expect(response).to have_http_status(:forbidden)
    headers = csrf_headers.merge("Origin" => "https://foreign.example")
    post "/api/v1/session", params: credentials, headers: headers, as: :json
    expect(response).to have_http_status(:forbidden)
  end
  it "issues an anonymous no-store token and HttpOnly cookie" do
    headers = csrf_headers
    expect(headers["X-CSRF-Token"]).to be_present
    expect(response.headers["Cache-Control"]).to include("no-store")
    expect(response.headers["set-cookie"].to_s.downcase).to include("httponly", "samesite=lax")
  end
end
