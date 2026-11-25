require_relative "boot"
require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_cable/engine"
Bundler.require(*Rails.groups)
module Landchecker
  class Application < Rails::Application
    config.load_defaults 8.1
    config.api_only = true
    config.autoload_lib(ignore: %w[assets tasks])
    config.middleware.use ActionDispatch::Cookies
    config.session_store :cookie_store, key: "_landchecker_session", httponly: true,
      same_site: :lax, expire_after: 12.hours, secure: Rails.env.production?
    config.middleware.use config.session_store, config.session_options
    config.action_controller.forgery_protection_origin_check = true
    config.action_cable.allow_same_origin_as_host = false
    config.action_cable.allowed_request_origins = ENV.fetch("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    config.hosts = %w[localhost 127.0.0.1 backend]
    config.filter_parameters += %i[password password_confirmation csrf_token]
  end
end
