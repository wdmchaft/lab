#!/usr/bin/env ruby
required_ruby_version = "1.9.3"
required_ruby_patchlevel = 194

minimum_node_version = "v0.8.6"

# make sure xcode-select is called
begin
  osx_major, osx_minor = `sw_vers -productVersion`.split('.')
  if osx_major.to_i >= 10 && osx_minor.to_i >= 8
    `xcode-select --print-path`
  end
rescue Errno::ENOENT
  puts "*** You don't appear to have XCode installed, can't run xcode-select --print-path ..."
  exit 1
end

if RUBY_VERSION != required_ruby_version && RUBY_PATCHLEVEL != required_ruby_patchlevel
  puts "*** building Lab project requires installation of Ruby #{required_ruby_version}-p#{required_ruby_patchlevel}"
  puts "*** You have Ruby #{RUBY_VERSION}-p#{RUBY_PATCHLEVEL} ..."
  exit 1
end

begin
  node_version = `node --version`.strip
  # Convert version strings to array of integers.
  node_version_arr = node_version.split('.').map { |e| e.to_i }
  minimum_node_version_arr = minimum_node_version.split('.').map { |e| e.to_i }
  # Compare version numbers one by one using array comparison operator.
  unless (node_version_arr <=> minimum_node_version_arr) >= 0
    puts "*** building Lab project requires installation of Node version  #{minimum_node_version}"
    puts "*** You have Node #{node_version} ..."
    exit 1
  end
rescue Errno::ENOENT
  puts "*** building Lab project requires installation of Node version  #{minimum_node_version}"
  puts "*** You don't appear to have Node installed ..."
  exit 1
end

exit 0
