import { ControlController } from '@/osmo/controllers/control.controller';
import { AbisRslController } from '@/osmo/controllers/abis_rsl.controller';
import { AbisOmlController } from '@/osmo/controllers/abis_oml.controller';
import { MediaController } from '@/osmo/controllers/media.controller';
import type { OsmoController, OsmoControllerClass } from '@/osmo/controllers/controller.type';
import { DefaultController } from '@/osmo/controllers/default.controller';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { SimpleLogger } from '@osmoweb/core/utils';
import type { OsmoParams } from '@/osmo/lib/common.types';

export class Router {
    private readonly log;
    private readonly controllerMap = new Map<string, OsmoControllerClass>([
        ['control', ControlController],
        ['abis_rsl', AbisRslController],
        ['abis_oml', AbisOmlController],
        ['media', MediaController],
    ]);

    private instanceCtrlMap = new Map<string, OsmoController>();
    private defaultController = new DefaultController();

    constructor(logger?: LoggerInterface) {
        this.log = logger ?? new SimpleLogger();
    }

    init = (osmoParams: OsmoParams) => {
        for (const [path, cls] of this.controllerMap.entries()) {
            this.instanceCtrlMap.set(path, new cls(osmoParams));
        }
    }

    to = (uri: string, port: Number): OsmoController => {
        const ctrlToken = uri.slice(uri.lastIndexOf('/') + 1);
        const ctrl = this.instanceCtrlMap.get(ctrlToken);
        if (ctrl) {
            this.log.debug?.(`(${port}) Routing to ${this.controllerMap.get(ctrlToken)!.name}`);
            return ctrl;
        }
        return this.defaultController;
    }

}