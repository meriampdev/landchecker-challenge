require "rails_helper"
RSpec.describe "Committed watched updates" do
  self.use_transactional_tests = false
  after { WatchlistEntry.delete_all; User.delete_all; Property.delete_all }
  it "sends compact updates only to current watchers and excludes removals" do
    user, property = make_user, make_property
    entry = user.watchlist_entries.create!(property: property)
    expect(WatchlistChannel).to receive(:broadcast_to).with(have_attributes(id: user.id), hash_including(type: "property.updated"))
    property.update!(price_cents: property.price_cents + 100_000)
    entry.destroy!
    expect(WatchlistChannel).not_to receive(:broadcast_to)
    property.update!(status: "under_offer")
  end
  it "does not broadcast unrelated or rolled-back updates" do
    property = make_property
    make_user.watchlist_entries.create!(property: property)
    expect(WatchlistChannel).not_to receive(:broadcast_to)
    property.update!(title: "Changed title")
    Property.transaction { property.update!(price_cents: 1); raise ActiveRecord::Rollback }
  end
end
