require "rails_helper"
RSpec.describe WatchlistChannel, type: :channel do
  it "streams only for the authenticated identity" do
    user = make_user
    stub_connection current_user: user
    subscribe
    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_for(user)
  end
  it "rejects owner-selection parameters" do
    stub_connection current_user: make_user
    subscribe user_id: 123
    expect(subscription).to be_rejected
  end
end
