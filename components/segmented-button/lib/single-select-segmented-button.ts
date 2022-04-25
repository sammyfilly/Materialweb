/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {SegmentedButton} from './segmented-button';

/** @soyCompatible */
export class SingleSelectSegmentedButton extends SegmentedButton {
  isMultiselect = false;
}