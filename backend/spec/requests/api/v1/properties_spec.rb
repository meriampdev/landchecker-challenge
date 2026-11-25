require "rails_helper"
RSpec.describe "Public properties", type: :request do
  it "returns public fields and fixed pagination without authentication" do
    13.times { make_property }
    get "/api/v1/properties", headers: { "Host" => "localhost" }
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["properties"].length).to eq(12)
    expect(response.parsed_body["meta"]).to include("total_count" => 13, "total_pages" => 2)
    expect(response.parsed_body["properties"].first.keys).to match_array(Property::FIELDS)
  end
  it "shows a public listing and returns 404 for missing listings" do
    property = make_property
    get "/api/v1/properties/#{property.id}", headers: { "Host" => "localhost" }
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["property"]).to eq(property.public_json)
    get "/api/v1/properties/0", headers: { "Host" => "localhost" }
    expect(response).to have_http_status(:not_found)
  end
  it "returns field errors and rejects client page size" do
    get "/api/v1/properties", params: { min_price: "-1" }, headers: { "Host" => "localhost" }
    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body.dig("error", "fields")).to have_key("min_price")
    get "/api/v1/properties", params: { per_page: "40" }, headers: { "Host" => "localhost" }
    expect(response).to have_http_status(:bad_request)
  end
end
