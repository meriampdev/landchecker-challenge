module Api
  module V1
    class UsersController < ApplicationController
      before_action :no_store
      def create
        unless [:email, :password, :password_confirmation].all? { |key| params[key].is_a?(String) }
          return render_error("invalid_parameters", "Email, password and password confirmation are required.", 422)
        end
        user = User.new(params.permit(:email, :password, :password_confirmation))
        unless user.save
          return render_error("validation_failed", user.errors.full_messages.join(". "), 422, user.errors.to_hash)
        end
        reset_session
        session[:user_id] = user.id
        session[:expires_at] = 12.hours.from_now.to_i
        render json: { user: user.as_json(only: [:id, :email]), csrf_token: form_authenticity_token }, status: :created
      rescue ActiveRecord::RecordNotUnique
        render_error("validation_failed", "Email has already been taken.", 422)
      end
    end
  end
end
