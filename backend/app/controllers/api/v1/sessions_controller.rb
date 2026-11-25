module Api
  module V1
    class SessionsController < ApplicationController
      before_action :no_store
      before_action :authenticate!, only: :destroy
      def create
        email, password = params[:email], params[:password]
        unless email.is_a?(String) && password.is_a?(String)
          return render_error("invalid_parameters", "Email and password must be strings.", 422)
        end
        user = User.find_by(email: email.strip.downcase)
        unless user&.authenticate(password)
          return render_error("invalid_credentials", "Email or password is incorrect.", 401)
        end
        reset_session
        session[:user_id] = user.id
        session[:expires_at] = 12.hours.from_now.to_i
        render json: { user: user.as_json(only: [:id, :email]), csrf_token: form_authenticity_token }
      end
      def destroy
        ActionCable.server.remote_connections.where(current_user: current_user).disconnect(reconnect: false)
        reset_session
        render json: { user: nil, csrf_token: form_authenticity_token }
      end
    end
  end
end
