  -- This file can be used to define own custom themes. Every theme needs to be declared in extraThemes.
  -- This file will not be overwritten when hackey trackey updates, so your themes are safe.
  -- Note that if new colors get added in the future, that you will have to update this file manually
  -- or else the new colors will revert to their defaults. Note that you may define multiple custom themes.
  --
  -- Missing color definitions will be taken from the Renoise theme.
  
  extraThemes = {
    custom = function(self)
      self.ellipsis         = 1  -- Draw ellipses instead of dots
      self.shadercolor      = {177/255, 171/255, 116/255, 1.0}
      self.harmonycolor     = {177/255, 171/255, 116/255, 1.0}
      self.harmonyselect    = {183/255, 255/255, 191/255, 1.0}
      self.helpcolor        = {243/255, 171/255, 116/255, 1.0} -- Determines how the functions are colored in the help
      self.helpcolor2       = {178/256, 178/256, 178/256, 1} -- Determines how the keys are colored in the help
      self.selectcolor      = {1, 234/256, 20/256, 1} -- Background color selection
      self.selecttext       = {0, 0, 0, 1} -- Foreground color selection
      self.textcolor        = {148/256, 148/256, 148/256, 1} -- pattern data text color (only used when normal and bar are left undefined)
      self.textcolorbar     = {1, 1, 1, 1} -- pattern data text color at bar (only used when normal and bar are left undefined)
      self.headercolor      = {215/256, 215/256, 215/256, 1} -- column headers, statusbar etc
      self.inactive         = {115/256, 115/256, 115/256, 1} -- column headers, statusbar etc
      self.linecolor        = {18/256,18/256,18/256, 0.6} -- normal row
      self.linecolor2       = {1/256*55, 1/256*55, 1/256*55, 0.6} -- beats (must not have 100% alpha as it's drawn over the cursor(!))
      self.linecolor3       = {1/256*180, 1/256*148, 1/256*120, 1} -- scroll indicating trangle thingy
      self.linecolor4       = {1/256*204, 1/256*204, 1/256*68, 1} -- Reaper edit cursor
      self.linecolor5       = {41/256, 41/256, 41/256, 1.0} -- Bar start
      self.loopcolor        = {1/256*204, 1/256*204, 1/256*68, 1} -- lines surrounding loop
      self.copypaste        = {1/256*57, 1/256*57, 1/256*20, 0.66}  -- the selection (should be lighter (not alpha blended) but is drawn over the data)
      self.scrollbar1       = {98/256, 98/256, 98/256, 1} -- scrollbar handle & outline
      self.scrollbar2       = {19/256, 19/256, 19/256, 1} -- scrollbar background
      self.changed          = {1, 1, 0, 1}  -- Color indicating a changed but uncommitted setting
      self.changed2         = {0, .5, 1, .5} -- Only listening
      self.windowbackground = {18/256, 18/256, 18/256, 1}  -- Window background. Note that the alpha channel is ignored.
      self.crtStrength      = 0  -- How strong should the CRT effect be when enabled.
      
      -- Colors that override the text colors for different columns
      -- When these are specified, the colors textcolor and textcolorbar are ignored.
      self.normal.mod1      = {243/255, 171/255, 116/255, 1.0}
      self.normal.mod2      = self.normal.mod1
      self.normal.mod3      = self.normal.mod1
      self.normal.mod4      = self.normal.mod1
      self.normal.modtxt1   = {243/255, 171/255, 116/255, 1.0}
      self.normal.modtxt2   = self.normal.modtxt1
      self.normal.modtxt3   = self.normal.modtxt1
      self.normal.modtxt4   = self.normal.modtxt1
      self.normal.vel1      = {186/255, 185/255, 108/255, 1.0}
      self.normal.vel2      = self.normal.vel1
      self.normal.delay1    = {123/255, 149/255, 197/255, 1.0}
      self.normal.delay2    = self.normal.delay1
      self.normal.fx1       = {183/255, 255/255, 191/255, 1.0}
      self.normal.fx2       = self.normal.fx1
      self.normal.end1      = {136/255, 80/255, 178/255, 1.0}
      self.normal.end2      = self.normal.end1
      
      self.bar.mod1         = {255/255, 159/255, 88/255, 1.0}
      self.bar.mod2         = self.bar.mod1
      self.bar.mod3         = self.bar.mod1
      self.bar.mod4         = self.bar.mod1
      self.bar.modtxt1      = {255/255, 159/255, 88/255, 1.0}
      self.bar.modtxt2      = self.bar.modtxt1
      self.bar.modtxt3      = self.bar.modtxt1
      self.bar.modtxt4      = self.bar.modtxt1
      self.bar.vel1         = {171/255, 169/255, 77/255, 1.0}
      self.bar.vel2         = self.bar.vel1
      self.bar.delay1       = {116/255, 162/255, 255/255, 1.0}
      self.bar.delay2       = self.bar.delay1
      self.bar.fx1          = {146/255, 255/255, 157/255, 1.0}
      self.bar.fx2          = self.bar.fx1
      self.bar.end1         = {136/255, 80/255, 178/255, 1.0}
      self.bar.end2         = self.bar.end1
      
      self.patternFont         = "DejaVu Sans"  -- Custom font. Note that it should be installed on the system.
      self.patternFontSize     = tracker.cfg.fontSize or 14  -- Font size. Usually overridden by the user already.
      self.customFontDisplace  = { self.patternFontSize-6, -3 }  -- Font displacement to fixup alignment issues.
    end
  }
    