class CreateProperties < ActiveRecord::Migration[8.1]
  def change
    create_table :properties do |t|
      %i[title address suburb property_type status].each { |name| t.string name, null: false }
      t.bigint :price_cents, null: false
      %i[bedrooms bathrooms parking_spaces].each { |name| t.integer name, null: false }
      t.string :image_path, null: false, default: ""
      t.timestamps null: false
    end
    add_check_constraint :properties, "price_cents BETWEEN 0 AND 9007199254740991", name: "safe_price"
    %w[bedrooms bathrooms parking_spaces].each { |name| add_check_constraint :properties, "#{name} >= 0", name: "nonnegative_#{name}" }
    add_check_constraint :properties, "property_type IN ('house','apartment','townhouse')", name: "valid_type"
    add_check_constraint :properties, "status IN ('available','under_offer','sold')", name: "valid_status"
    add_index :properties, [:property_type, :price_cents]
    add_index :properties, :price_cents
    add_index :properties, :bedrooms
  end
end
