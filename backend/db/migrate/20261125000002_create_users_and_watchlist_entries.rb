class CreateUsersAndWatchlistEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :password_digest, null: false
      t.timestamps null: false
    end
    add_index :users, "lower(email)", unique: true
    create_table :watchlist_entries do |t|
      t.references :user, null: false, index: false, foreign_key: { on_delete: :cascade }
      t.references :property, null: false, index: false, foreign_key: { on_delete: :cascade }
      t.timestamps null: false
    end
    add_index :watchlist_entries, [:user_id, :property_id], unique: true
    add_index :watchlist_entries, [:property_id, :user_id]
  end
end
