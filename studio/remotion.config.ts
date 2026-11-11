import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// three.js needs a real GPU context in headless Chrome
Config.setChromiumOpenGlRenderer("angle");
