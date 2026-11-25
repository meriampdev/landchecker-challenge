ENV["RAILS_ENV"] = "test"
require_relative "../config/environment"
abort("Test database required") unless ActiveRecord::Base.connection_db_config.database.end_with?("_test")
require "rspec/rails"
ActiveRecord::Migration.maintain_test_schema!
Dir[Rails.root.join("spec/support/**/*.rb")].sort.each { |f| require f }
RSpec.configure do |config|
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
end
