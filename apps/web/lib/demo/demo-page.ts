import type { PageByHandleResponse } from "@grabbin/api";

const DEMO_PAGE = {
  page: {
    id: "demo-page",
    userId: "demo-user",
    handle: "demo",
    name: "Maynard",
    bio: "Traveling all around the world\nDoing what I like\n\nCat lover 🐈",
    image:
      "users/pNltlwfyWfhbiyDakkKbEPQTQOqkl86Z/1817c60c-7bd9-4105-bf15-a69e8ab3f2df/profile/87119c1d-cabf-4a0d-98a5-5966b2365a16.png",
    imageSource:
      "users/pNltlwfyWfhbiyDakkKbEPQTQOqkl86Z/1817c60c-7bd9-4105-bf15-a69e8ab3f2df/profile/87119c1d-cabf-4a0d-98a5-5966b2365a16.png",
    imageCrop: { x: 0, y: 0, width: 100, height: 100 },
    role: "photographer",
    createdAt: "2026-08-17T12:00:00.000Z",
    updatedAt: "2026-08-17T12:12:01.300Z",
  },
  items: [
    {
      id: "demo-item-media-1",
      style: {},
      layouts: {
        wide: { x: 2, y: 4, w: 2, h: 4 },
        compact: { x: 0, y: 0, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:06:58.630Z",
      updatedAt: "2026-08-17T12:12:01.300Z",
      type: "media",
      data: {
        objectKey: "demo/media/5.jpg",
        mimeType: "image/jpeg",
        mediaUrl:
          "https://cdn.grabbin.me/users/pNltlwfyWfhbiyDakkKbEPQTQOqkl86Z/1817c60c-7bd9-4105-bf15-a69e8ab3f2df/5.jpg",
      },
    },
    {
      id: "demo-item-media-2",
      style: {},
      layouts: {
        wide: { x: 0, y: 4, w: 2, h: 2 },
        compact: { x: 1, y: 0, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:07:07.022Z",
      updatedAt: "2026-08-17T12:12:01.300Z",
      type: "media",
      data: {
        objectKey: "demo/media/4.jpg",
        mimeType: "image/jpeg",
        mediaUrl:
          "https://cdn.grabbin.me/users/pNltlwfyWfhbiyDakkKbEPQTQOqkl86Z/1817c60c-7bd9-4105-bf15-a69e8ab3f2df/4.jpg",
      },
    },
    {
      id: "demo-item-media-3",
      style: {},
      layouts: {
        wide: { x: 3, y: 8, w: 1, h: 2 },
        compact: { x: 0, y: 2, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:07:28.156Z",
      updatedAt: "2026-08-17T12:12:57.077Z",
      type: "media",
      data: {
        objectKey: "demo/media/IMG_2021.JPG",
        mimeType: "image/jpeg",
        mediaUrl:
          "https://cdn.grabbin.me/users/pNltlwfyWfhbiyDakkKbEPQTQOqkl86Z/1817c60c-7bd9-4105-bf15-a69e8ab3f2df/IMG_2021.JPG",
      },
    },
    {
      id: "demo-item-text-1",
      style: {},
      layouts: {
        wide: { x: 0, y: 1, w: 1, h: 2 },
        compact: { x: 1, y: 2, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:07:45.890Z",
      updatedAt: "2026-08-17T12:11:29.875Z",
      type: "text",
      data: { text: "Hi 👋🏻\nFeel free to edit!" },
    },
    {
      id: "demo-item-link-1",
      style: {},
      layouts: {
        wide: { x: 1, y: 1, w: 2, h: 1 },
        compact: { x: 0, y: 4, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:07:59.400Z",
      updatedAt: "2026-08-17T12:11:32.436Z",
      type: "link",
      data: {
        url: "https://x.com/x",
        metadata: {
          title: "X (Twitter)",
          description: "what's happening?!",
          faviconUrl:
            "https://pub-166ebfc3d7814935bb3933545a02637d.r2.dev/assets/link-provider-icon/x.svg",
          imageUrl:
            "https://pbs.twimg.com/profile_images/1955359038532653056/OSHY3ewP_200x200.jpg",
          provider: "x",
          providerData: {
            followerCount: 60767473,
            followerCountLabel: "60767473",
            followerCountApproximate: false,
          },
        },
      },
    },
    {
      id: "demo-item-link-2",
      style: {},
      layouts: {
        wide: { x: 3, y: 1, w: 1, h: 2 },
        compact: { x: 1, y: 4, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:08:30.906Z",
      updatedAt: "2026-08-17T12:11:45.279Z",
      type: "link",
      data: {
        url: "https://www.instagram.com/bts.bighitofficial/",
        metadata: {
          title: "Instagram",
          description:
            "81M Followers, 13 Following, 110 Posts - See Instagram photos and videos from BTS official (@bts.bighitofficial)",
          faviconUrl:
            "https://pub-166ebfc3d7814935bb3933545a02637d.r2.dev/assets/link-provider-icon/instagram.svg",
          imageUrl:
            "https://scontent-ssn1-1.cdninstagram.com/v/t51.82787-19/749652868_18576613621075834_3305084378993563391_n.jpg?stp=dst-jpg_s100x100_tt6&_nc_cat=1&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDQyLkMzIn0%3D&_nc_ohc=RQPiHFKGdIwQ7kNvwHk7FTZ&_nc_oc=AdqLaMyUTZ1PMAvS6M5SiuABE2cMkugqYFe0EJfe-U-mEKHEWOZrfeBAySWngKOAT04&_nc_zt=24&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_gid=2RzRkOf4e-QPTTtBAZWXkg&_nc_ss=7260f&oh=00_AQH_srQF2NfUqWzsC5_uCMqBanoqz8Rr9x_vd5ca5xijSQ&oe=6A88BA29",
          provider: "instagram",
          providerData: {
            followerCount: 81000000,
            followerCountLabel: "81M",
            followerCountApproximate: true,
          },
        },
      },
    },
    {
      id: "demo-item-link-3",
      style: {},
      layouts: {
        wide: { x: 1, y: 2, w: 2, h: 1 },
        compact: { x: 0, y: 6, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:09:04.298Z",
      updatedAt: "2026-08-17T12:11:46.615Z",
      type: "link",
      data: {
        url: "https://www.threads.com/@threads",
        metadata: {
          title: "mind notes.",
          description:
            "7.0M Followers • 1.3K Threads • Come see what everyone’s talking about 💬. See the latest conversations with @threads.",
          faviconUrl:
            "https://pub-166ebfc3d7814935bb3933545a02637d.r2.dev/assets/link-provider-icon/threads.svg",
          imageUrl:
            "https://scontent-ssn1-1.cdninstagram.com/v/t51.82787-19/696068532_17966595924102532_922885636998957794_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=1&ccb=7-5&_nc_sid=b3fa00&_nc_ohc=72byMN-7uvkQ7kNvwFIGvIh&_nc_oc=AdrF3OHGSHtgXiFiyMKGVgZK-aUJpeBkT7d5FbKMCIBQsZVpl37a-cknn_sBNIMIiU8&_nc_zt=24&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_gid=bGVIqNMbt0zufK5G0l8cXQ&_nc_ss=7220f&oh=00_AQEzjeCBO-v8zbOIij8HqbtSJHBSqMK6rZwCY0Ss3HVtZg&oe=6A88C3A5",
          provider: "threads",
          providerData: {
            followerCount: 7000000,
            followerCountLabel: "7.0M",
            followerCountApproximate: true,
          },
        },
      },
    },
    {
      id: "demo-item-media-4",
      style: {},
      layouts: {
        wide: { x: 1, y: 12, w: 2, h: 4 },
        compact: { x: 1, y: 6, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:09:57.267Z",
      updatedAt: "2026-08-17T12:12:51.599Z",
      type: "media",
      data: {
        objectKey: "demo/media/bento-music.png",
        mimeType: "image/png",
        mediaUrl:
          "https://cdn.grabbin.me/users/pNltlwfyWfhbiyDakkKbEPQTQOqkl86Z/1817c60c-7bd9-4105-bf15-a69e8ab3f2df/bento-music.png",
      },
    },
    {
      id: "demo-item-section-1",
      style: {},
      layouts: {
        wide: { x: 0, y: 0, w: 4, h: 1 },
        compact: { x: 0, y: 8, w: 2, h: 1 },
      },
      createdAt: "2026-08-17T12:10:15.246Z",
      updatedAt: "2026-08-17T12:11:27.835Z",
      type: "section",
      data: { title: "Links" },
    },
    {
      id: "demo-item-media-5",
      style: {},
      layouts: {
        wide: { x: 0, y: 6, w: 1, h: 2 },
        compact: { x: 0, y: 9, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:10:26.726Z",
      updatedAt: "2026-08-17T12:12:01.300Z",
      type: "media",
      data: {
        objectKey: "demo/media/fold.jpg",
        mimeType: "image/jpeg",
        mediaUrl:
          "https://cdn.grabbin.me/users/pNltlwfyWfhbiyDakkKbEPQTQOqkl86Z/1817c60c-7bd9-4105-bf15-a69e8ab3f2df/fold.jpg",
      },
    },
    {
      id: "demo-item-media-6",
      style: {},
      layouts: {
        wide: { x: 0, y: 8, w: 2, h: 4 },
        compact: { x: 1, y: 9, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:11:02.427Z",
      updatedAt: "2026-08-17T12:12:01.300Z",
      type: "media",
      data: {
        objectKey: "demo/media/toolbar-map.png",
        mimeType: "image/png",
        mediaUrl:
          "https://cdn.grabbin.me/users/pNltlwfyWfhbiyDakkKbEPQTQOqkl86Z/1817c60c-7bd9-4105-bf15-a69e8ab3f2df/toolbar-map.png",
      },
    },
    {
      id: "demo-item-section-2",
      style: {},
      layouts: {
        wide: { x: 0, y: 3, w: 4, h: 1 },
        compact: { x: 0, y: 11, w: 2, h: 1 },
      },
      createdAt: "2026-08-17T12:11:59.254Z",
      updatedAt: "2026-08-17T12:12:01.300Z",
      type: "section",
      data: { title: "photo~~~~~~~" },
    },
    {
      id: "demo-item-media-7",
      style: {},
      layouts: {
        wide: { x: 2, y: 8, w: 1, h: 4 },
        compact: { x: 0, y: 12, w: 1, h: 2 },
      },
      createdAt: "2026-08-17T12:12:47.125Z",
      updatedAt: "2026-08-17T12:12:50.109Z",
      type: "media",
      data: {
        objectKey: "demo/media/photo-1644409718092-c92a5f93b4d6.webp",
        mimeType: "image/webp",
        mediaUrl:
          "https://cdn.grabbin.me/users/pNltlwfyWfhbiyDakkKbEPQTQOqkl86Z/1817c60c-7bd9-4105-bf15-a69e8ab3f2df/photo-1644409718092-c92a5f93b4d6.webp",
      },
    },
    {
      id: "demo-item-map-1",
      style: {},
      layouts: {
        wide: { x: 0, y: 16, w: 2, h: 4 },
        compact: { x: 0, y: 14, w: 2, h: 4 },
      },
      createdAt: "2026-08-19T12:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
      type: "map",
      data: {
        latitude: 35.6762,
        longitude: 139.6503,
        zoom: 12,
      },
    },
  ],
} satisfies PageByHandleResponse;

export function getDemoPage(): PageByHandleResponse {
  return structuredClone(DEMO_PAGE);
}
