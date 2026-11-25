require "rails_helper"
RSpec.describe User do
  it "normalizes email and validates password and case-insensitive uniqueness" do
    user = described_class.create!(email: " ALEX@EXAMPLE.COM ", password: "DemoPassword123!")
    expect(user.email).to eq("alex@example.com")
    expect(described_class.new(email: "alex@example.com", password: "short")).not_to be_valid
    expect(user.authenticate("wrong")).to be(false)
  end
end
