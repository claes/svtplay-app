{
  description = "SVT Play Electron wrapper (Nix flake)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
    in {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          electron = (pkgs.electron_31 or (pkgs.electron_30 or pkgs.electron));
        in {
          default = pkgs.stdenv.mkDerivation {
            pname = "svtplay-app";
            version = "0.1.0";

            src = ./.;

            nativeBuildInputs = [ pkgs.makeWrapper ];

            # We don't need to build any node modules; the app is just JS loaded by Electron.
            installPhase = ''
              runHook preInstall

              appdir="$out/lib/svtplay-app"
              mkdir -p "$appdir"

              # Copy the minimal app payload expected by Electron (package.json + src + optional assets)
              cp -r package.json "$appdir/"
              if [ -d src ]; then cp -r src "$appdir/"; fi
              if [ -d assets ]; then cp -r assets "$appdir/"; fi
              if [ -f README.md ]; then cp README.md "$appdir/"; fi

              mkdir -p "$out/bin"
              makeWrapper ${electron}/bin/electron "$out/bin/svtplay-app" \
                --add-flags "$appdir" \
                --set ELECTRON_DISABLE_SECURITY_WARNINGS true

              # Desktop entry (Linux)
              mkdir -p "$out/share/applications"
              cat > "$out/share/applications/svtplay-app.desktop" <<EOF
              [Desktop Entry]
              Name=SVT Play
              Comment=Watch svtplay.se in a desktop window
              Exec=svtplay-app %U
              Terminal=false
              Type=Application
              Categories=AudioVideo;Video;Network;
              Icon=svtplay-app
              EOF

              # Icon if provided
              if [ -f "$appdir/assets/icon.png" ]; then
                mkdir -p "$out/share/icons/hicolor/512x512/apps"
                cp "$appdir/assets/icon.png" "$out/share/icons/hicolor/512x512/apps/svtplay-app.png"
              fi

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Minimal Electron wrapper for svtplay.se";
              homepage = "https://www.svtplay.se/";
              # License intentionally omitted; this package only ships the wrapper code.
              maintainers = [];
              platforms = platforms.linux ++ platforms.darwin;
              mainProgram = "svtplay-app";
            };
          };
        }
      );

      apps = forAllSystems (system:
        let pkg = self.packages.${system}.default; in {
          default = {
            type = "app";
            program = "${pkg}/bin/svtplay-app";
          };
        }
      );

      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          electron = (pkgs.electron_31 or (pkgs.electron_30 or pkgs.electron));
        in {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_20
              electron
            ];
            # With the shell, `electron` is on PATH so `npm start` works without installing node deps.
            shellHook = ''
              echo "Dev shell ready: electron=$(electron --version 2>/dev/null || true)"
              echo "Run: npm start   (uses the shell's electron)"
            '';
          };
        }
      );
    };
}
