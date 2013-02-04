class DashboardController < ApplicationController

  layout 'readme', :only => %w{ readme license }
  
  def readme
    @title = "Lab Technical Documentation"
  end

  def license
    title = "Lab: License"
  end
end
