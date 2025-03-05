import { GeneratedImage } from "@/types/GeneratedImage"
import Image from "next/image"
import "./ChatImage.module.scss"

interface Props {
  image: GeneratedImage
}

export default function ChatImage({ image }: Props) {
  return (
    <div className="flex mb-3">
      <div className="relative mx-auto max-w-[80%]">
        <div
          className="image relative rounded-md py-2 px-4 bg-blue-500 text-white mr-2"
          style={{ backgroundColor: image.color }}
        >
          <Image src={image.imageUrl || ''} alt={image.caption || 'Generated Image'} width={200} height={200} />
          {!image.caption && <>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </>}
          { image.caption }
        </div>
        {image.error && <div
          v-if="message.error"
          className="mx-2 text-xs absolute bottom-0 text-nowrap left-1/2 transform -translate-x-1/2"
        >
          Error sending image request.
        </div>
        }
      </div>
    </div>
  )
}