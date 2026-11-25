require "rails_helper"
RSpec.describe Property do
  it "rejects invalid prices, room counts, types and statuses" do
    property = make_property
    [{price_cents: -1}, {price_cents: 9_007_199_254_740_992}, {bedrooms: -1}, {property_type: "villa"}, {status: "missing"}].each do |attributes|
      property.reload.assign_attributes(attributes)
      expect(property).not_to be_valid
    end
  end
  it "enforces price integrity even when validations are skipped" do
    property = make_property
    expect { property.update_columns(price_cents: -1) }.to raise_error(ActiveRecord::StatementInvalid)
  end
end
