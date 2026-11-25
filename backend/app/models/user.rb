class User < ApplicationRecord
  has_secure_password
  has_many :watchlist_entries, dependent: :destroy
  has_many :properties, through: :watchlist_entries
  normalizes :email, with: ->(email) { email.strip.downcase }
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: { case_sensitive: false }
  validates :password, length: { minimum: 8 }, allow_nil: true
end
