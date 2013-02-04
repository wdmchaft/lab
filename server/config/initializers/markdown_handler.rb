# config/initializers/markdown_handler.rb

class ActionView::Template
  class Redcarpet
    class << self
      def renderer
        @renderer ||= ::Redcarpet::Markdown.new(
                                                ::Redcarpet::Render::HTML,
                                                :autolink => true,
                                                :fenced_code_blocks => true
                                                )
      end
    end

    def call(template)
      self.class.renderer.render(template.source).inspect
    end
  end

  register_template_handler :md, Redcarpet.new
end
