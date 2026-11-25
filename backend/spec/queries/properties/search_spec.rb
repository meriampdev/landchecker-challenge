require "rails_helper"
RSpec.describe Properties::Search do
  def search(**params)
    described_class.new(params.stringify_keys).call
  end
  it "combines inclusive AUD, type and bedroom filters" do
    wanted = make_property(price_cents: 95_000_000)
    make_property(price_cents: 94_999_900)
    make_property(property_type: "apartment")
    make_property(bedrooms: 2)
    result = search(min_price: "950000", max_price: "950000", min_bedrooms: "3", property_type: "house")
    expect(result[:properties].map { |p| p["id"] }).to eq([wanted.id])
  end
  it "matches location case-insensitively by suburb, postcode or address and combines filters" do
    wanted = make_property(address: "12 Garden Street", suburb: "Richmond VIC 3121", bedrooms: 4)
    make_property(suburb: "Carlton VIC 3053")
    expect(search(location: " richMONd ", min_bedrooms: "4")[:properties].map { |p| p["id"] }).to eq([wanted.id])
    expect(search(location: "3121")[:meta][:total_count]).to eq(1)
    expect(search(location: "garden street")[:meta][:total_count]).to eq(1)
    expect(search(location: "unknown")[:properties]).to be_empty
    expect(search(location: "   ")[:meta][:total_count]).to eq(2)
  end
  it "treats wildcard characters literally and validates location input" do
    make_property
    expect(search(location: "%")[:properties]).to be_empty
    expect(search(location: "_")[:properties]).to be_empty
    expect { search(location: "x" * 201) }.to raise_error(described_class::Invalid)
    expect { search(location: []) }.to raise_error(described_class::Invalid)
  end
  it "paginates with stable order and accurate metadata" do
    ids = 25.times.map { make_property.id }
    first = search
    second = search(page: "2")
    expect(first[:properties].map { |p| p["id"] }).to eq(ids.first(12))
    expect(second[:properties].map { |p| p["id"] }).to eq(ids[12,12])
    expect(search(page: "3")[:properties].length).to eq(1)
    expect(search(page: "4")[:properties]).to be_empty
    expect(first[:meta]).to include(total_count: 25, total_pages: 3, per_page: 12)
  end
  it "accepts blanks and zero filters" do
    make_property(price_cents: 0, bedrooms: 0)
    expect(search(min_price: "0", max_price: "", min_bedrooms: "0")[:properties].length).to eq(1)
  end
  it "rejects malformed shapes, ranges and unknown paging options" do
    [{page: ""}, {page: "0"}, {page: "2147483648"}, {min_price: []}, {min_price: "1.5"}, {min_bedrooms: "-1"}, {property_type: "villa"}, {min_price: "20", max_price: "10"}, {per_page: "100"}].each do |params|
      expect { search(**params) }.to raise_error(described_class::Invalid)
    end
  end
end
