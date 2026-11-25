module Properties
  class Search
    class Invalid < StandardError
      attr_reader :fields, :status
      def initialize(fields, status = 422)
        @fields, @status = fields, status
        super("Check the supplied filters.")
      end
    end
    KEYS = %w[min_price max_price min_bedrooms property_type location page].freeze
    def initialize(params)
      @params = params.to_h.stringify_keys
    end
    def call
      raise Invalid.new({}, 400) if (@params.keys - KEYS).any?
      values = {}
      @params.each do |key, value|
        raise Invalid.new({ key => ["must be scalar"] }) unless value.is_a?(String)
        next if key != "page" && value.empty?
        if key == "location"
          value = value.strip
          raise Invalid.new({ key => ["must be 200 characters or fewer"] }) if value.length > 200
          values[key] = value unless value.empty?
        elsif key == "property_type"
          raise Invalid.new({ key => ["is invalid"] }) unless Property::TYPES.include?(value)
          values[key] = value
        else
          limit = key.include?("price") ? 90_071_992_547_409 : 2_147_483_647
          raise Invalid.new({ key => ["must be a whole number within range"] }) unless value.match?(/\A[0-9]+\z/) && value.length <= 15 && value.to_i <= limit
          values[key] = value.to_i
        end
      end
      page = values.fetch("page", 1)
      raise Invalid.new({ page: ["must be positive"] }) if page < 1
      if values["min_price"] && values["max_price"] && values["min_price"] > values["max_price"]
        raise Invalid.new({ max_price: ["must be at least minimum price"] })
      end
      scope = Property.all
      scope = scope.where("price_cents >= ?", values["min_price"] * 100) if values.key?("min_price")
      scope = scope.where("price_cents <= ?", values["max_price"] * 100) if values.key?("max_price")
      scope = scope.where("bedrooms >= ?", values["min_bedrooms"]) if values.key?("min_bedrooms")
      scope = scope.where(property_type: values["property_type"]) if values.key?("property_type")
      if values.key?("location")
        pattern = "%#{ActiveRecord::Base.sanitize_sql_like(values["location"])}%"
        scope = scope.where("suburb ILIKE :location OR address ILIKE :location", location: pattern)
      end
      count = scope.count
      { properties: scope.order(:id).offset((page - 1) * 12).limit(12).map(&:public_json),
        meta: { page: page, per_page: 12, total_count: count, total_pages: (count / 12.0).ceil } }
    end
  end
end
