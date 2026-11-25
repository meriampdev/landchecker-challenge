class WatchlistChannel < ApplicationCable::Channel
  def subscribed
    return reject unless (params.keys.map(&:to_s) - ["channel"]).empty?
    stream_for current_user
  end
end
