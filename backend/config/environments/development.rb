Rails.application.configure do
  config.enable_reloading = true
  # Check mtimes between requests, including bind mounts without filesystem events.
  config.file_watcher = ActiveSupport::FileUpdateChecker
  config.eager_load = false
  config.consider_all_requests_local = true
  config.active_record.schema_format = :ruby
end
