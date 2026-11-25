module Api
  module V1
    class PropertiesController < ApplicationController
      def show
        render json: { property: Property.find(params[:id]).public_json }
      end
      def index
        render json: Properties::Search.new(request.query_parameters).call
      rescue Properties::Search::Invalid => exception
        render_error("invalid_parameters", exception.message, exception.status, exception.fields)
      end
    end
  end
end
