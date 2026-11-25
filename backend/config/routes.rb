Rails.application.routes.draw do
  mount ActionCable.server => "/cable"
  namespace :api do
    namespace :v1 do
      resource :csrf, only: :show, controller: "csrf"
      resource :session, only: [:create, :destroy]
      resource :me, only: :show, controller: "me"
      resources :users, only: :create
      resources :properties, only: [:index, :show]
      get "watchlist", to: "watchlist#index"
      put "watchlist/:property_id", to: "watchlist#update"
      delete "watchlist/:property_id", to: "watchlist#destroy"
    end
  end
  match "*path", to: ->(_env) { [404, { "content-type" => "application/json" }, ['{"error":{"code":"not_found","message":"Resource not found.","fields":{}}}']] }, via: :all
end
