require "rails_helper"
RSpec.describe ApplicationCable::Connection, type: :channel do
  it "rejects anonymous connections" do
    expect { connect "/cable" }.to have_rejected_connection
  end
  it "rejects tampered session cookies" do
    cookies[Rails.application.config.session_options[:key]] = "tampered"
    expect { connect "/cable" }.to have_rejected_connection
  end
end
