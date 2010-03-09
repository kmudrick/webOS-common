// Copyright 2008-2009 severally by the contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Feedback: to be used by a webOS app using the Mojo SDK for prompting
 * a user to rate/review the application launched from.
 */
var Feedback = Class.create({
  
  initialize: function(sceneAssistant, launchesToWait, daysToWait, isDebug) {
    
    this.sceneAssistant = sceneAssistant;
    this.isDebug = isDebug;
    
    this.feedbackCookie = new Mojo.Model.Cookie("feedback");
    this.feedbackModel = this.feedbackCookie.get();
    Mojo.Log.info("Feedback model is currently %j", this.feedbackModel);
    if (this.feedbackModel == undefined) {      
      this.feedbackModel = this.createNewModel();
      Mojo.Log.info("Must be the first time.. creating new feedback model %j", this.feedbackModel);
    }
    
    // XXX Maybe only reset on major number changes?
    if (this.feedbackModel.version != Mojo.Controller.appInfo.version) {
      // Version changed, so re-set the feedback model data
      this.feedbackModel = this.createNewModel();
      Mojo.Log.info("Changed version from %s to %s so, creating new feedback model %j", 
                    this.feedbackModel.version, Mojo.Controller.appInfo.version, this.feedbackModel);
    }
    
    this.feedbackModel.launchCount++;
    
    var waitMillis = 1000 * 60 * 60 * 24 * daysToWait;
    var todayMillis = (new Date()).getTime();
    
    Mojo.Log.info("Feedback? isDebug=%s, feedbackModel=%j, waiting=%s", isDebug ? "true" : "false", this.feedbackModel, waitMillis);
    
    // In Debug mode or the launch count / time elapsed combination is triggering
    if (isDebug || (!this.feedbackModel.showedPrompt 
                    && this.feedbackModel.launchCount >= launchesToWait 
                    && this.feedbackModel.firstLaunch + waitMillis <= todayMillis)) {
      // Prompt user
      this.sceneAssistant.controller.showAlertDialog({
        title: "Rate #{title}".interpolate({
          "title": Mojo.Controller.appInfo.title
        }),
        message: "If you enjoy #{title}, would you mind taking a moment to rate/review it?".interpolate({
          "title": Mojo.Controller.appInfo.title
        }),
        choices: [
          { label: $L("No Thanks"), value: "no", type: "negative" },  
          { label: $L("Yes"), value: "yes", type: "affirmative" },
          { label: $L("Remind Me Later"), value: "remind", type: "dismiss" }    
        ],
        preventCancel: true,
        onChoose: this.choiceHandler.bind(this)
      });
    }
    this.save();
  },
  
  choiceHandler: function(choice) {
    var remindMe = false;
    switch (choice) {
      case "no":
        Mojo.Log.info("User does not want to submit a review");
        break;
      case "yes": 
        this.launchAppCatalog();
        break;
      case "remind":
        Mojo.Log.info("User wants a later reminder for feedback");
        remindMe = true;
        break;
    }
    this.finish(remindMe);
  },

  launchAppCatalog: function() {
    Mojo.Log.info("User wants to submit a review");
    var appUrl = "http://developer.palm.com/appredirect/?packageid=" + Mojo.Controller.appInfo.id;
    Mojo.Log.info("Launching app url %s", appUrl);    
    this.sceneAssistant.controller.serviceRequest("palm://com.palm.applicationManager", {
      method: "open",
      parameters: {
        target: appUrl
      }
    });
  },
  
  createNewModel: function() {
    return {
      "version": Mojo.Controller.appInfo.version,
      "launchCount": 0,
      "firstLaunch": (new Date()).getTime(),
      "showedPrompt": false
    }
  },
  
  save: function() {
    Mojo.Log.info("Saving feedback %j", this.feedbackModel);
    this.feedbackCookie.put(this.feedbackModel);  
  },
  
  finish: function(remindMe) {
    if (remindMe) {
      // "Remind Me Later" should reset the launch count
      this.feedbackModel.launchCount = 0;
    }
    // Say we showed the prompt only if Yes or No was clicked (i.e. user did
    // not request a later reminder)
    this.feedbackModel.showedPrompt = !remindMe
    this.save();
  }
  
});