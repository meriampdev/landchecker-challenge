module Api
  module V1
    class WatchlistController < ApplicationController
      # This endpoint has no body fields; Rails-generated wrappers are not input.
      wrap_parameters false

      before_action :authenticate!
      before_action :validate_parameters!
      def index
        page = params.fetch(:page, "1").to_i
        entries = current_user.watchlist_entries.order(:property_id)
        # IDs keep saved controls accurate outside this page without serializing every listing.
        ids = entries.pluck(:property_id)
        pages = (ids.length / 12.0).ceil
        page = [page, [pages, 1].max].min
        properties = entries.includes(:property).offset((page - 1) * 12).limit(12)
        render json: { properties: properties.map { |entry| entry.property.public_json },
          saved_ids: ids, meta: { page: page, per_page: 12, total_count: ids.length, total_pages: pages } }
      end
      def update
        property = Property.find(params[:property_id])
        begin
          current_user.watchlist_entries.find_or_create_by!(property: property)
        rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique
          # A competing request may have committed after the initial lookup.
          raise unless current_user.watchlist_entries.exists?(property_id: property.id)
        end
        render json: { property: property.public_json }
      end
      def destroy
        property = Property.find(params[:property_id])
        current_user.watchlist_entries.where(property_id: property.id).destroy_all
        head :no_content
      end
      private
      def validate_parameters!
        extra = request.query_parameters.keys
        extra -= ["page"] if action_name == "index"
        extra += request.request_parameters.keys
        if action_name == "index"
          page = params[:page]
          if page && (!page.is_a?(String) || !page.match?(/\A[1-9][0-9]{0,8}\z/))
            return render_error("invalid_parameters", "Invalid page.", 422)
          end
        end
        if extra.any?
          return render_error("invalid_parameters", "Owner and body overrides are not accepted.", 400)
        end
        if params[:property_id] && !params[:property_id].match?(/\A[1-9][0-9]{0,17}\z/)
          render_error("invalid_parameters", "Invalid property ID.", 422)
        end
      end
    end
  end
end
