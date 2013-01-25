class ParsingError < StandardError; end

class Parser
  attr_accessor :data_hash
  attr_accessor :uri_helper
  
  def initialize(uri=Dir.pwd,data={})
    self.data_hash = {}
    self.update_data!(data)
    self.uri_helper = UriHelper.from_def(uri)
  end
 
   # TODO: transform hash-structure based on version info
  def migrate!; end

  def update_data!(new_datas={})
    case new_datas
    when String 
      return update_from_json!(new_datas)
    when Hash 
      return update_from_hash!(new_datas)
    end
    self.migrate!
    return self
  end

  def update_from_hash!(hash)
    self.data_hash.merge!(hash)
    return self
  end

  def update_from_json!(json)
    begin
      self.update_from_hash!(JSON.parse(json))
    rescue JSON::ParserError
      raise ParsingError.new("invalid json")
    end
  end

  def update_from_uri!()
    if self.uri_helper
      json_string = self.uri_helper.read
      self.update_from_json!(json_string)
    end # TODO: warn?
    return self
  end

  def parse
    return data_hash
  end
  
  def parse_collection(data_label, collection, parser)
    hashes     = self.data_hash[data_label]
    if hashes
      hashes.each do |hash_data| 
        collection << parser.new(self.uri_helper,hash_data).parse
      end
    else
      raise ParsingError.new("can't find data item in data #{data_label}")
    end
    collection
  end
end