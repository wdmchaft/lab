class InteractivesController < ApplicationController

  def index
    groups = Group.correct_order.collect do |g|
       Presenters::Group.new(g).json_listing
    end
    interactives = Interactive.all.collect do |i|
       presenter(i).json_listing
    end
    render :json => {
      'interactives'  => interactives,
      'groups'        => groups
    }
  end

  def show
    render :json => presenter.runtime_properties
  end

  def group_list
    interactives = Interactive.all.collect do |i|
       presenter(i).group_listing
    end
    render :json => interactives
  end

  def create
    # create_path_and_id(params[:interactive])
    group = Group.find(params[:interactive][:groupKey])
    groupKey = group.path.gsub('/','_')
    title = params[:interactive][:title].gsub(' ', '_')
    
    params[:interactive][:id] = "interactives_#{groupKey}_#{title}"
    params[:interactive][:path] = "/interactives/#{params[:interactive][:id]}"


    @interactive = Interactive.new(params[:interactive])
    @interactive.group = group


    interactive_model = InteractiveModel.new(:viewOptions => params[:interactive][:models].first[:viewOptions],
                                             :parameters => params[:interactive][:parameters],
                                             :outputs => params[:interactive][:outputs],
                                             :filteredOutputs => params[:interactive][:filteredOutputs])
  

    orig_model_url = params[:interactive][:models].first[:url]
    model_id = orig_model_url.split('/').last.gsub('.json','')
    model = Models::Md2d.find(model_id)
    new_model = Models::Md2d.create(model.attributes)

    interactive_model.md2d = new_model
    interactive_model.save!
    @interactive.interactive_models << interactive_model
    
    if @interactive.save
      render({
        :json     => @interactive,
        :status   => :created,
        :location => interactive_path(@interactive)
      })
    else
      render({
        :json => @interactive.errors,
        :status => :unprocessable_entity
      })
    end
  end

  private
  def presenter(model=nil)
    model ||= Interactive.get(params[:id])
    Presenters::Interactive.new(model)
  end

end
