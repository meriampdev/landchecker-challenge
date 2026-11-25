# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_25_000002) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "properties", force: :cascade do |t|
    t.string "title", null: false
    t.string "address", null: false
    t.string "suburb", null: false
    t.string "property_type", null: false
    t.string "status", null: false
    t.bigint "price_cents", null: false
    t.integer "bedrooms", null: false
    t.integer "bathrooms", null: false
    t.integer "parking_spaces", null: false
    t.string "image_path", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["bedrooms"], name: "index_properties_on_bedrooms"
    t.index ["price_cents"], name: "index_properties_on_price_cents"
    t.index ["property_type", "price_cents"], name: "index_properties_on_property_type_and_price_cents"
    t.check_constraint "bathrooms >= 0", name: "nonnegative_bathrooms"
    t.check_constraint "bedrooms >= 0", name: "nonnegative_bedrooms"
    t.check_constraint "parking_spaces >= 0", name: "nonnegative_parking_spaces"
    t.check_constraint "price_cents >= 0 AND price_cents <= '9007199254740991'::bigint", name: "safe_price"
    t.check_constraint "property_type::text = ANY (ARRAY['house'::character varying, 'apartment'::character varying, 'townhouse'::character varying]::text[])", name: "valid_type"
    t.check_constraint "status::text = ANY (ARRAY['available'::character varying, 'under_offer'::character varying, 'sold'::character varying]::text[])", name: "valid_status"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", null: false
    t.string "password_digest", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((email)::text)", name: "index_users_on_lower_email", unique: true
  end

  create_table "watchlist_entries", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "property_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "user_id"], name: "index_watchlist_entries_on_property_id_and_user_id"
    t.index ["user_id", "property_id"], name: "index_watchlist_entries_on_user_id_and_property_id", unique: true
  end

  add_foreign_key "watchlist_entries", "properties", on_delete: :cascade
  add_foreign_key "watchlist_entries", "users", on_delete: :cascade
end
