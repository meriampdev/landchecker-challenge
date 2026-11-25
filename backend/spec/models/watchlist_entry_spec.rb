require "rails_helper"
RSpec.describe WatchlistEntry do
  it "rejects duplicates at the model and database boundaries" do
    user, property = make_user, make_property
    user.watchlist_entries.create!(property: property)
    duplicate = user.watchlist_entries.new(property: property)
    expect(duplicate).not_to be_valid
    expect { duplicate.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
  end
end
