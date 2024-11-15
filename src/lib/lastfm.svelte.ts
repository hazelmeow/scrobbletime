import { z } from "zod";

export interface LastfmState {
  username: string | null;
  period: string;
  loading: boolean;
  errored: boolean;
  progress: number;
  tracks: TopTrack[];
}

const API_URL = "https://ws.audioscrobbler.com/2.0";
const API_KEY = "ce39f3a68eaed32130add8e2cd5e1148";

const imageSchema = z.object({
  size: z.string(),
  "#text": z.string(),
});
export type Image = z.infer<typeof imageSchema>;

const topTrackSchema = z.object({
  "@attr": z.object({
    rank: z.coerce.number(),
  }),
  name: z.string(),
  image: z.array(imageSchema),
  artist: z.object({
    url: z.string(),
    name: z.string(),
    mbid: z.string(),
  }),
  url: z.string(),
  duration: z.coerce.number(),
  playcount: z.coerce.number(),
});
export type TopTrack = z.infer<typeof topTrackSchema>;

const userGetTopTracksSchema = z.object({
  toptracks: z.object({
    "@attr": z.object({
      page: z.coerce.number(),
      perPage: z.coerce.number(),
      total: z.coerce.number(),
      totalPages: z.coerce.number(),
      user: z.string(),
    }),
    track: z.array(topTrackSchema),
  }),
});

const userGetTopTracks = async ({
  username,
  limit,
  page,
  period,
}: {
  username: string;
  limit: number;
  page: number;
  period: string;
}) => {
  const urlParams = new URLSearchParams({
    api_key: API_KEY,
    format: "json",
    method: "user.getTopTracks",
    username: username,
    limit: limit.toString(),
    page: page.toString(),
    period,
  });
  const res = await fetch(API_URL + "?" + urlParams.toString()).then((r) =>
    r.json()
  );
  const parsed = userGetTopTracksSchema.parse(res);
  return parsed;
};

export const lastfm = $state<LastfmState>({
  username: null,
  period: "overall",
  loading: false,
  errored: false,
  progress: 0,
  tracks: [],
});

export const loadLastfm = async (username: string, period: string) => {
  // TODO: abort controller?
  if (lastfm.loading) return;

  lastfm.username = username;
  lastfm.period = period;
  lastfm.loading = true;
  lastfm.errored = false;
  lastfm.progress = 0;
  lastfm.tracks = [];

  let totalPages = 1;
  let nextPage = 1;
  while (nextPage <= totalPages) {
    let res;
    try {
      res = await userGetTopTracks({
        username,
        limit: 1000,
        page: nextPage,
        period,
      });
    } catch (e) {
      console.error("error while fetching", e);
      lastfm.errored = true;
      break;
    }

    totalPages = res.toptracks["@attr"].totalPages;
    lastfm.progress = nextPage / totalPages;
    nextPage += 1;

    while (res.toptracks.track.length) {
      const track = res.toptracks.track.shift()!;
      lastfm.tracks.push(track);
    }
  }

  lastfm.loading = false;
};

interface ListItem {
  leftLabel: string;
  leftUrl: string;
  rightLabel: string;
  rightUrl: string;
  playcount: number;
  playcountEstimate: number;
  duration: number;
  totalDuration: number;
  totalDurationEstimate: number;
}

export const calcStats = (tracks: TopTrack[]) => {
  const tracksWithDuration = tracks.filter((t) => t.duration !== 0);
  const tracksWithoutDuration = tracks.filter((t) => t.duration === 0);

  const countTracks = tracks.length;
  const countTracksWithDuration = tracksWithDuration.length;
  const countTracksWithoutDuration = countTracks - countTracksWithDuration;

  const totalPlaysWithDuration = tracksWithDuration.reduce(
    (a, t) => a + t.playcount,
    0
  );

  const averageDuration = Math.round(
    tracksWithDuration
      .map((t) => t.duration! * t.playcount)
      .reduce((a, x) => a + x, 0) / totalPlaysWithDuration
  );

  const totalDurationMinimum = tracksWithDuration.reduce(
    (a, t) => a + t.duration * t.playcount,
    0
  );
  const totalDurationEstimate =
    totalDurationMinimum +
    tracksWithoutDuration.reduce(
      (a, t) => a + t.playcount * averageDuration,
      0
    );

  const totalScrobbles = tracks.reduce((a, t) => a + t.playcount, 0);

  const trackStats = tracks.map((t) => {
    return {
      leftLabel: t.name,
      leftUrl: t.url,
      rightLabel: t.artist.name,
      rightUrl: t.artist.url,
      duration: t.duration,
      playcount: t.playcount,
      playcountEstimate: t.playcount,
      totalDuration: t.duration * t.playcount,
      totalDurationEstimate:
        (t.duration === 0 ? averageDuration : t.duration) * t.playcount,
    } satisfies ListItem;
  });

  const artistStats = Object.values(
    tracks.reduce((a, t) => {
      const key = t.artist.name;

      if (!a[key]) {
        a[key] = {
          leftLabel: t.artist.name,
          leftUrl: t.artist.url,
          playcount: 0,
          playcountEstimate: 0,
          totalDuration: 0,
          totalDurationEstimate: 0,
          rightLabel: "",
          rightUrl: "",
          duration: 0,
        };
      }

      if (t.duration === 0) {
        a[key].playcountEstimate += t.playcount;
        a[key].totalDurationEstimate += averageDuration * t.playcount;
      } else {
        a[key].playcount += t.playcount;
        a[key].playcountEstimate += t.playcount;
        a[key].totalDuration += t.duration * t.playcount;
        a[key].totalDurationEstimate += t.duration * t.playcount;
      }

      return a;
    }, {} as Record<string, ListItem>)
  );
  const countArtists = artistStats.length;

  return {
    tracksWithDuration,
    countTracks,
    countTracksWithDuration,
    countTracksWithoutDuration,
    averageDuration,
    totalDurationMinimum,
    totalDurationEstimate,
    totalScrobbles,
    countArtists,
    artistStats,
    trackStats,
  };
};
