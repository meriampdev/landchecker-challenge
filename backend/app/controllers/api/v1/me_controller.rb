module Api
  module V1
    class MeController < ApplicationController
      before_action :authenticate!
      def show
        render json: { user: current_user.as_json(only: [:id, :email]) }
      end
    end
  end
end
