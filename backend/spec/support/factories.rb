module RecordHelpers
  def make_property(**attributes)
    Property.create!({ title: "Garden Home", address: "#{SecureRandom.hex(4)} Demo Street", suburb: "Richmond VIC 3121", property_type: "house", price_cents: 95_000_000, bedrooms: 3, bathrooms: 2, parking_spaces: 1, status: "available", image_path: "" }.merge(attributes))
  end
  def make_user(email: "alex@example.com")
    User.create!(email: email, password: "DemoPassword123!")
  end
end
RSpec.configure { |config| config.include RecordHelpers }
