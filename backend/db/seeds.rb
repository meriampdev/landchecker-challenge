if Rails.env.development?
  ActiveRecord::Base.transaction do
    ActiveRecord::Base.connection.execute("SELECT pg_advisory_xact_lock(7390142)")
    properties = 48.times.map do |i|
      Property.find_or_create_by!(address: "#{i + 10} Demo Street") do |p|
        p.assign_attributes(title: i.zero? ? "Harbour View House" : "#{%w[Garden City Park][i % 3]} Home #{i + 1}",
          suburb: ["Richmond VIC 3121", "Carlton VIC 3053", "Fitzroy VIC 3065"][i % 3],
          property_type: Property::TYPES[i % 3], price_cents: 95_000_000 + i * 1_000_000,
          bedrooms: 1 + i % 5, bathrooms: 1 + i % 3, parking_spaces: i % 3,
          status: Property::STATUSES[i % 3], image_path: "")
      end
    end
    %w[alex sam].each_with_index do |name, index|
      next if User.exists?(email: "#{name}@example.com")
      user = User.create!(email: "#{name}@example.com", password: "DemoPassword123!")
      [properties[0], properties[index + 1]].each { |p| user.watchlist_entries.create!(property: p) }
    end
  end
end
