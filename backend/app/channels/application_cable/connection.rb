module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user
    def connect
      data = cookies.encrypted[Rails.application.config.session_options[:key]] || {}
      expiry = data["expires_at"].to_i
      self.current_user = User.find_by(id: data["user_id"]) if expiry > Time.current.to_i
      reject_unauthorized_connection unless current_user
      @expiry_timer = Concurrent::ScheduledTask.execute([expiry - Time.current.to_i, 0].max) { close(reason: "Session expired", reconnect: false) }
    end
    def disconnect
      @expiry_timer&.cancel
    end
  end
end
