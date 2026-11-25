class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection
  protect_from_forgery with: :exception
  before_action :require_json
  rescue_from ActionController::InvalidAuthenticityToken do
    render_error("invalid_csrf", "Your security token expired. Please retry.", 403)
  end
  rescue_from ActiveRecord::RecordNotFound do
    render_error("not_found", "Resource not found.", 404)
  end
  rescue_from ActiveRecord::RecordInvalid do |exception|
    render_error("validation_failed", "Check the supplied values.", 422, exception.record.errors.to_hash)
  end
  rescue_from ActionController::ParameterMissing, ActionDispatch::Http::Parameters::ParseError do
    render_error("invalid_parameters", "Invalid request parameters.", 400)
  end
  private
  def render_error(code, message, status, fields = {})
    render json: { error: { code: code, message: message, fields: fields } }, status: status
  end
  def no_store
    response.headers["Cache-Control"] = "no-store"
  end
  def current_user
    return @current_user if defined?(@current_user)
    @current_user = session[:expires_at].to_i > Time.current.to_i ? User.find_by(id: session[:user_id]) : nil
  end
  def authenticate!
    no_store
    render_error("authentication_required", "Please log in.", 401) unless current_user
  end
  def require_json
    return if request.get? || request.head? || request.raw_post.empty?
    render_error("unsupported_media_type", "Use a JSON request body.", 415) unless request.media_type == "application/json"
  end
end
