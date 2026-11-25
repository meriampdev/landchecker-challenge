namespace :demo do
  desc "Increase the known watched listing by AUD 1,000 and toggle status"
  task update_property: :environment do
    abort "Development demo only" unless Rails.env.development?
    property = Property.find_by!(address: "10 Demo Street")
    property.with_lock do
      property.update!(price_cents: property.price_cents + 100_000,
        status: property.status == "available" ? "under_offer" : "available")
    end
    puts "Property #{property.id}: AUD #{property.price_cents / 100.0}, #{property.status}"
  end
end
