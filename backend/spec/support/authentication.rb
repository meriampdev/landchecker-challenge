module AuthenticationHelpers
  def csrf_headers
    get "/api/v1/csrf"
    { "X-CSRF-Token" => response.parsed_body.fetch("csrf_token"), "Origin" => "http://localhost:5173", "Host" => "localhost:5173" }
  end
  def sign_in(user)
    post "/api/v1/session", params: { email: user.email, password: "DemoPassword123!" }, headers: csrf_headers, as: :json
    expect(response).to have_http_status(:ok)
    { "X-CSRF-Token" => response.parsed_body.fetch("csrf_token"), "Origin" => "http://localhost:5173", "Host" => "localhost:5173" }
  end
end
RSpec.configure { |config| config.include AuthenticationHelpers, type: :request }
