import { GeneratedImage } from "@/types/GeneratedImage"
import Image from "next/image"
import styles from "./ChatImage.module.scss"

interface Props {
  image?: GeneratedImage
}

export default function ChatImage({ image }: Props) {
  return (
    <div className="flex mb-3">
      <div className="relative mx-auto max-w-[80%]">
        <div
          className={styles.image + " relative rounded-md py-2 px-4 bg-blue-500 text-white mr-2"}
          style={{ backgroundColor: image?.color }}
        >
          {image?.imageUrl &&
            <Image src={image.imageUrl as string} alt={image.caption || 'Generated Image'} width={200} height={200} />
          }
          <div className="text-center mt-2 text-sm max-w-[200px]">
            {image?.caption}
          </div>
          {!image?.caption && !image?.imageUrl && <>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </>}
        </div>
        {image && image.error && <div className="mx-2 text-xs absolute bottom-0 text-nowrap left-1/2 transform -translate-x-1/2">
          Error sending image request.
        </div>}
      </div>
    </div>
  )
}