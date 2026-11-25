require "rails_helper"
require "rake"
RSpec.describe "demo:update_property" do
  before do
    Rails.application.load_tasks unless Rake::Task.task_defined?("demo:update_property")
  end
  it "refuses to mutate the test environment" do
    task = Rake::Task["demo:update_property"]
    task.reenable
    expect { task.invoke }.to raise_error(SystemExit)
  end
end
