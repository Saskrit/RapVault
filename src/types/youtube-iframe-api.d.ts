declare namespace YT {
  const PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };

  type PlayerEvent = {
    target: Player;
    data: number;
  };

  type PlayerOptions = {
    videoId?: string;
    width?: string | number;
    height?: string | number;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: PlayerEvent) => void;
    };
  };

  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    getDuration(): number;
    getCurrentTime(): number;
    destroy(): void;
  }
}

interface Window {
  YT?: {
    Player: typeof YT.Player;
    PlayerState: typeof YT.PlayerState;
  };
  onYouTubeIframeAPIReady?: () => void;
}
