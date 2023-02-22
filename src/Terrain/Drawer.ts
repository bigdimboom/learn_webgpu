import { DrawSystem } from "./DrawSystem";

export class Drawer extends DrawSystem
{
    async Initialize(): Promise<boolean> {




        return true;
    }
    
    Update(): void 
    {


    }

    Draw(): void {

        const message = `DeltaTime is ${this.deltaTS}`;
        console.log(`rendering....${message}`);

    }
    
}