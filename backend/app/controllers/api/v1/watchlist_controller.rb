module Api
  module V1
    class WatchlistController < ApplicationController
      # This endpoint has no body fields; Rails-generated wrappers are not input.
      wrap_parameters false

      before_action :authenticate!
      before_action :validate_parameters!
      def index
        entries = current_user.watchlist_entries.includes(:property).order(:property_id)
        render json: { properties: entries.map { |entry| entry.property.public_json } }
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
        extra = request.query_parameters.keys + request.request_parameters.keys
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
