# Terminal segment: the real one-command re-run. Colours from brand/tokens.json (Terminal theme).
Output work/rerun.mp4
Set Shell "bash"
Set FontFamily "Menlo"
Set FontSize 30
Set Width 1920
Set Height 860
Set Padding 64
Set LineHeight 1.25
Set TypingSpeed 70ms
Set Framerate 30
Set Theme { "name": "NearQuery Terminal", "black": "#121210", "red": "#ff6a3d", "green": "#5cc4ae", "yellow": "#e3b85a", "blue": "#8fa8f0", "magenta": "#ff8a63", "cyan": "#5cc4ae", "white": "#eeeae0", "brightBlack": "#a39e90", "brightRed": "#ff8a63", "brightGreen": "#5cc4ae", "brightYellow": "#e3b85a", "brightBlue": "#8fa8f0", "brightMagenta": "#ff8a63", "brightCyan": "#5cc4ae", "brightWhite": "#eeeae0", "background": "#121210", "foreground": "#eeeae0", "selection": "#36342e", "cursor": "#ff6a3d" }

Hide
Type "cd .. && export PS1='$ ' && clear"
Enter
Sleep 800ms
Show
Sleep 1s
Type "make all"
Sleep 700ms
Enter
Sleep 40s
Type "git diff --quiet THESIS.md && echo 'THESIS.md: no changes'"
Sleep 400ms
Enter
Sleep 4s
