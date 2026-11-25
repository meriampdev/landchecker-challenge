class Property < ApplicationRecord
  TYPES = %w[house apartment townhouse].freeze
  STATUSES = %w[available under_offer sold].freeze
  FIELDS = %w[id title address suburb property_type price_cents bedrooms bathrooms parking_spaces status image_path updated_at].freeze
  has_many :watchlist_entries, dependent: :destroy
  validates :title, :address, :suburb, presence: true
  validates :property_type, inclusion: { in: TYPES }
  validates :status, inclusion: { in: STATUSES }
  validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 9_007_199_254_740_991 }
  validates :bedrooms, :bathrooms, :parking_spaces, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  after_update_commit :broadcast_watched_changes
  def public_json
    as_json(only: FIELDS).merge("updated_at" => updated_at.iso8601(6))
  end
  private
  def broadcast_watched_changes
    return unless saved_change_to_price_cents? || saved_change_to_status?
    event = { type: "property.updated", property: { id: id, price_cents: price_cents, status: status, updated_at: updated_at.iso8601(6) } }
    watchlist_entries.distinct.pluck(:user_id).each do |user_id|
      WatchlistChannel.broadcast_to(User.new(id: user_id), event)
    end
  rescue StandardError => error
    Rails.logger.error("Property broadcast failed: #{error.class}")
  end
end
